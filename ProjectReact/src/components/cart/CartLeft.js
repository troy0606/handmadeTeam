import React, { useState, useContext, useEffect, useCallback } from "react";
import CartStore from "./CartStore";
import { checkoutAction } from "./CartAction";
import { usePaymentInputs } from "react-payment-inputs";
import { useAlert } from "react-alert";
import Cards from "react-credit-cards";
import "react-credit-cards/lib/styles.scss";

// 購物車信用卡介面
export class PaymentForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cvc: "",
      expiry: "",
      focus: "",
      name: "   ",
      number: ""
    };
  }
  // 信用卡狀態

  handleInputFocus = e => {
    this.setState({ focus: e.target.name });
  };
  // setState 欄位focus

  handleInputChange = e => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };
  // setState 解構事件目標
  // setState (事件目標名稱 : 輸入的值)

  render() {
    return (
      <div id="PaymentForm">
        <Cards
          cvc={this.state.cvc}
          expiry={this.state.expiry}
          focused={this.state.focus}
          name={this.state.name}
          number={this.state.number}
          style={{ width: "1000px" }}
        />
        <form className="creditCardForm d-flex flex-column">
          <input
            className="my-3 mx-auto"
            style={{ maxWidth: "300px" }}
            type="tel"
            name="number"
            placeholder="Card Number"
            pattern="/^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6011[0-9]{12}|622((12[6-9]|1[3-9][0-9])|([2-8][0-9][0-9])|(9(([0-1][0-9])|(2[0-5]))))[0-9]{10}|64[4-9][0-9]{13}|65[0-9]{14}|3(?:0[0-5]|[68][0-9])[0-9]{11}|3[47][0-9]{13})*$/"
            maxLength={16}
            onChange={this.handleInputChange}
            onFocus={this.handleInputFocus}
            // 如果沒有勾選信用卡(狀態)則無法輸入
            disabled={!this.props.creditRadio}
          />
          <input
            className="my-3 mx-auto"
            style={{ maxWidth: "300px" }}
            type="tel"
            name="expiry"
            placeholder="Expiry"
            maxLength={4}
            onChange={this.handleInputChange}
            onFocus={this.handleInputFocus}
            disabled={!this.props.creditRadio}
          />
          <input
            className="my-3 mx-auto"
            style={{ maxWidth: "300px" }}
            type="tel"
            name="cvc"
            placeholder="CVC"
            maxLength={3}
            onChange={this.handleInputChange}
            onFocus={this.handleInputFocus}
            disabled={!this.props.creditRadio}
          />
        </form>
      </div>
    );
  }
}

const CartLeft = ({
  courseCards,
  ingreCards,
  setCourseCards,
  setIngreCards,
  setPage,
  step,
  setStep
}) => {
  const alert = useAlert();
  const [cartTotal, setCartTotal] = useState(0);
  // 購物車總價
  const [fnCartTotal, setFnCartTotal] = useState(0);
  // 購物車最終總價(含優惠卷或紅利)
  const [coupon, setCoupon] = useState(0);
  // 使用的優惠卷編號
  const [couponUse, setCouponUse] = useState(0);
  const [bonusUse, setBonusUse] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [bonusStandard, setBonusStandard] = useState(0);
  const [bonusDuration, setBonusDuration] = useState("");
  const [creditRadio, setCreditRadio] = useState(false);
  const { cartCourseDispatch, cartIngreDispatch, id } = useContext(CartStore);
  const [couponSelect, setCouponSelect] = useState();

  let CartTotal = (courseCards, ingreCards) => {
    if (courseCards && ingreCards) {
      let courseTotal = courseCards.reduce((courseCardA, courseCardB) => {
        return (
          courseCardA +
          courseCardB.course_order_applicants * courseCardB.course_price
        );
      }, 0);
      let ingreTotal = ingreCards.reduce((ingreCardA, ingreCardB) => {
        return (
          ingreCardA +
          ingreCardB.ingredients_order_quantity * ingreCardB.ingredients_price
        );
      }, 0);
      return courseTotal + ingreTotal;
    } else {
      return "沒有商品";
    }
  };

  const getBonusStandard = async () => {
    const bonusStandardJson = await fetch(
      "http://localhost:5000/handmade/cart/getbonusstandard/"
    );
    const bonusStandardInit = await bonusStandardJson.json();
    setBonusStandard(bonusStandardInit.bonus_percentage);
    setBonusDuration(bonusStandardInit.bonus_duration);
  };

  const getBonus = async () => {
    const bonusJson = await fetch(
      "http://localhost:5000/handmade/cart/getbonus/" + id
    );
    const bonusGet = await bonusJson.json();
    setBonusUse(bonusGet);
  };

  const getCoupon = async () => {
    const couponJson = await fetch(
      "http://localhost:5000/handmade/cart/getcoupon/" + id
    );
    const couponGet = await couponJson.json();
    setCouponUse(couponGet);
  };

  const coponSelect = e => {
    const value = e.target.value;
    const index = e.target[e.target.selectedIndex].index;
    setCouponSelect(couponUse[index].coupon_price);
    setCoupon(value);
  };
  const cartSubmit = async () => {
    try {
      const user = localStorage.getItem("member_id");
      const courseCart = localStorage.getItem(`courseCart${user}`);
      const ingreCart = localStorage.getItem(`ingreCart${user}`);
      let afterBonus;
      if (coupon) {
        afterBonus = bonusUse - bonus + Math.ceil(fnCartTotal * bonusStandard);
      } else {
        afterBonus = bonusUse - bonus + Math.ceil(cartTotal * bonusStandard);
      }
      const cart = JSON.stringify({
        courseCart: courseCart,
        ingreCart: ingreCart,
        user: user,
        coupon: coupon,
        bonusUsed: bonus,
        totalPrice: fnCartTotal ? fnCartTotal : cartTotal,
        bonus: afterBonus
      });
      const url = `http://localhost:5000/handmade/cart/submitcart`;
      const dataJson = await fetch(url, {
        method: "POST",
        body: cart,
        headers: { "Content-Type": "application/json" }
      });
      const data = await dataJson.json();
      const order_Sid = await data[0].order_sid;
      let orderCreate_time = await data[0].order_create_time;
      let [orderDate, orderTime] = await orderCreate_time.split("T");
      orderTime = await orderTime.split(".")[0];
      alert.success(`訂單${order_Sid}新增完成`);
      localStorage.setItem(`courseCart${user}`, "[]");
      await setCourseCards();
      await cartCourseDispatch(checkoutAction());
      localStorage.setItem(`ingreCart${user}`, "[]");
      await setIngreCards();
      await cartIngreDispatch(checkoutAction());
      setTimeout(()=>{
        window.location = "http://localhost:3000/handmade/member/order";
      },1000)
    } catch (e) {
      console.log(e);
    }
  };
  const checkBonus = e => {
    setBonus(e.target.value > bonusUse ? bonus : e.target.value);
  };

  useEffect(() => {
    setCartTotal(CartTotal(courseCards, ingreCards));
    if (bonus) {
      setCartTotal(CartTotal(courseCards, ingreCards) - bonus);
    } else {
      setCartTotal(CartTotal(courseCards, ingreCards));
    }
  }, [courseCards, ingreCards, bonus]);

  useEffect(() => {
    Promise.all([setPage(4), getBonus(), getCoupon(), getBonusStandard()]);
    // 頁面載入時抓取紅利/優惠卷/紅利標準
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // couponSelect > 10 ? couponSelect / 100 : couponSelect / 10 判斷折數為兩位獲一位，回傳
    const couponAfter =
      cartTotal * (couponSelect > 10 ? couponSelect / 100 : couponSelect / 10);
      // 購物車*折扣數
    if (bonus) {
      // 如果有使用紅利
      // 設定最終購物車-紅利
      setFnCartTotal(Math.floor(couponAfter) - bonus);
    } else {
      setFnCartTotal(Math.floor(couponAfter));
    }
    // 選取優惠卷或紅利後 componentDidUpdate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponSelect, bonus]);

  return (
    <>
      <div className="col-md-5  col-12 px-3 checkLeftBox">
        <div>
          <div className="checkPageIconBox d-flex align-items-center justify-content-around">
            <div
              className="d-flex align-items-center"
              onClick={() => setStep(0)}
              // 點擊時跑到第一步
            >
              <div className="checkPageIcon cartStep">1</div>
              <h5 style={{ color: "#f78177", fontWeight: "bold" }}>
                確認數量/金額
              </h5>
            </div>
            <hr style={step ? { background: "#f78177" } : {}} />
            <div
              className="d-flex align-items-center"
              onClick={() => {
                // 如果課程或食材購物車不為空則點擊時跑到第二步，否則留第一步
                courseCards.length || ingreCards.length
                  ? setStep(1)
                  : setStep(0);
              }}
            >
              <div
                className="checkPageIcon cartStep2"
                style={step !== 0 ? { backgroundColor: "#f78177" } : {}}
              >
                2
              </div>
              <h5
                style={
                  step === 0
                    ? { color: "#fff" }
                    : { color: "#f78177", fontWeight: "bold" }
                }
              >
                選擇付款方式/結帳
              </h5>
            </div>
          </div>
          <div className="checkPageBox">
            <h4>訂單摘要</h4>
            <div className="d-flex flex-column">
              <div className="checkOrderDeduct">
                <ul className="mt-4 w-100">
                  {step ? (
                    <>
                    {/* 如果step為true則顯示以下內容 */}
                      <li>
                        <p>可用優惠卷</p>
                        {couponUse.length ? (
                          <select
                            id="coupon"
                            onClick={e => {
                              coponSelect(e);
                            }}
                          >
                          {/* 如果有可使用優惠卷，則跑map迴圈顯示下拉選單 */}
                            {couponUse.map((coupon, index = 0) => {
                              return (
                                <option index={index} value={coupon.coupon_sid}>
                                  {coupon.coupon_content}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          ""
                        )}
                      </li>
                      {step ? (
                        <li>
                          <p>可用折扣</p>
                          <h4>{couponSelect}折</h4>
                          {/* 顯示使用折扣 */}
                        </li>
                      ) : (
                        ""
                      )}
                    </>
                  ) : (
                    ""
                  )}
                  <li>
                    <p>可用紅利</p>
                    <h4>$ {bonusUse}</h4>
                  </li>
                  {step ? (
                    <li className="flex-column">
                      <p>使用紅利</p>
                      <input
                        type="number"
                        onChange={event => {
                          checkBonus(event);
                        }}
                        value={bonus}
                        max={bonusUse + ""}
                        maxLength={(bonusUse + "").length}
                      />
                    </li>
                  ) : (
                    ""
                  )}
                </ul>
              </div>
              <div>
                <div className="checkOrderTotal">
                  <p>結帳總額</p>
                  <h4>
                    ${" "}
                    {step ? (fnCartTotal ? fnCartTotal : cartTotal) : cartTotal}
                    {/* 第二步的話，顯示(如最終購物車有值則顯示最終購物車，否則顯示購物車總價) */}
                  </h4>
                </div>
                <p style={{ color: "white", fontWeight: "bold" }}>
                  可獲得紅利:{" "}
                  {step
                    ? fnCartTotal
                      ? Math.ceil(fnCartTotal * bonusStandard)
                      : Math.ceil(cartTotal * bonusStandard)
                    : Math.ceil(cartTotal * bonusStandard)}
                    {/* 可獲得紅利為 (如最終購物車有值則顯示最終購物車*紅利標準，否則顯示購物車總價*紅利標準)*/}
                </p>
                <p style={{ color: "white" }}>紅利計算率: {bonusStandard}</p>
                <p style={{ color: "white" }}>紅利截止日期: {bonusDuration}</p>
              </div>
            </div>
          </div>
        </div>
        {step ? (
          <>
            <div className="creditCard">
              <div className="d-flex align-items-center justify-content-center">
                <input
                  type="checkbox"
                  name="pay"
                  onChange={() => {
                    setCreditRadio(!creditRadio);
                    // 設定解鎖信用卡輸入
                  }}
                />
                <p>使用信用卡</p>
              </div>
              <PaymentForm creditRadio={creditRadio} />
              {/* 上方信用卡在這顯示 */}
            </div>
          </>
        ) : (
          ""
        )}
        {!step ? (
          <button
            onClick={() => {
              courseCards.length || ingreCards.length ? setStep(1) : setStep(0);
              // 如果購物車有東西才可去下一步
            }}
          >
            NEXT
          </button>
        ) : (
          <button onClick={() => cartSubmit()} style={{marginTop:"150px"}}>
            CHECK
          </button>
        )}
      </div>
    </>
  );
};

export default CartLeft;
